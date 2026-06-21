#!/usr/bin/env bash
set -euo pipefail

# Git Bash/MSYS on Windows rewrites Linux-style container paths such as
# /opt/mssql-tools18/bin/sqlcmd into Windows paths unless disabled.
export MSYS_NO_PATHCONV="${MSYS_NO_PATHCONV:-1}"
export MSYS2_ARG_CONV_EXCL="${MSYS2_ARG_CONV_EXCL:-*}"

LOCAL_CONTAINER="${LOCAL_CONTAINER:-kartawarta-sqlserver}"
REMOTE_HOST="${REMOTE_HOST:-kartawarta}"
REMOTE_PATH="${REMOTE_PATH:-/opt/kartawarta}"
REMOTE_CONTAINER="${REMOTE_CONTAINER:-kartawarta-sqlserver}"
DB_NAME="${DB_NAME:-cardmarket}"
DB_USER="${DB_USER:-sa}"
ARCHIVE_NAME="${ARCHIVE_NAME:-catalog_tables.bacpac}"
LOCAL_TMP_DIR="${LOCAL_TMP_DIR:-./tmp}"

usage() {
  cat <<USAGE
Usage: DB_PASSWORD=... [REMOTE_DB_PASSWORD=...] scripts/sync_catalog_tables.sh [export|upload|import|all]

Copies only TCG, Expansion, and Card data from your local Docker SQL Server
container to the VPS Docker SQL Server container.

Actions:
  export  Export local tables into ./${LOCAL_TMP_DIR#./}/catalog_tables.bacpac
  upload  Copy the bacpac to the VPS with scp
  import  Import the bacpac into VPS SQL Server and merge into ${DB_NAME}
  all     Run export, upload, and import (default)

Environment variables:
  DB_PASSWORD         Local SQL Server sa password. Required.
  REMOTE_DB_PASSWORD  VPS SQL Server sa password. Defaults to DB_PASSWORD.
  LOCAL_CONTAINER     Local SQL container. Default: kartawarta-sqlserver
  REMOTE_HOST         SSH target. Default: kartawarta
  REMOTE_PATH         Project path on VPS. Default: /opt/kartawarta
  REMOTE_CONTAINER    VPS SQL container. Default: kartawarta-sqlserver
  DB_NAME             Database name. Default: cardmarket
  DB_USER             SQL user. Default: sa
USAGE
}

require_passwords() {
  if [[ -z "${DB_PASSWORD:-}" ]]; then
    echo "DB_PASSWORD is required." >&2
    usage >&2
    exit 2
  fi
  REMOTE_DB_PASSWORD="${REMOTE_DB_PASSWORD:-$DB_PASSWORD}"
}

sqlcmd_in_container() {
  local container="$1"
  local password="$2"
  local script_path="$3"
  docker exec -i "$container" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U "$DB_USER" -P "$password" -C -b -i "$script_path"
}

ensure_local_tools() {
  docker exec "$LOCAL_CONTAINER" bash -lc 'test -x /opt/mssql-tools18/bin/sqlcmd'
  docker exec "$LOCAL_CONTAINER" bash -lc 'test -x /opt/mssql-tools18/bin/sqlpackage' || {
    echo "Installing sqlpackage in local container..."
    docker exec -u 0 "$LOCAL_CONTAINER" bash -lc '
      set -euo pipefail
      apt-get update
      apt-get install -y --no-install-recommends wget unzip ca-certificates
      wget -q https://aka.ms/sqlpackage-linux -O /tmp/sqlpackage.zip
      mkdir -p /opt/mssql-tools18/bin/sqlpackage-bin
      unzip -q -o /tmp/sqlpackage.zip -d /opt/mssql-tools18/bin/sqlpackage-bin
      chmod +x /opt/mssql-tools18/bin/sqlpackage-bin/sqlpackage
      ln -sf /opt/mssql-tools18/bin/sqlpackage-bin/sqlpackage /opt/mssql-tools18/bin/sqlpackage
      rm -rf /var/lib/apt/lists/* /tmp/sqlpackage.zip
    '
  }
}

ensure_remote_tools() {
  ssh "$REMOTE_HOST" "docker exec '$REMOTE_CONTAINER' bash -lc 'test -x /opt/mssql-tools18/bin/sqlcmd'"
  ssh "$REMOTE_HOST" "docker exec '$REMOTE_CONTAINER' bash -lc 'test -x /opt/mssql-tools18/bin/sqlpackage'" || {
    echo "Installing sqlpackage in VPS container..."
    ssh "$REMOTE_HOST" "docker exec -u 0 '$REMOTE_CONTAINER' bash -lc '
      set -euo pipefail
      apt-get update
      apt-get install -y --no-install-recommends wget unzip ca-certificates
      wget -q https://aka.ms/sqlpackage-linux -O /tmp/sqlpackage.zip
      mkdir -p /opt/mssql-tools18/bin/sqlpackage-bin
      unzip -q -o /tmp/sqlpackage.zip -d /opt/mssql-tools18/bin/sqlpackage-bin
      chmod +x /opt/mssql-tools18/bin/sqlpackage-bin/sqlpackage
      ln -sf /opt/mssql-tools18/bin/sqlpackage-bin/sqlpackage /opt/mssql-tools18/bin/sqlpackage
      rm -rf /var/lib/apt/lists/* /tmp/sqlpackage.zip
    '"
  }
}

export_local() {
  require_passwords
  mkdir -p "$LOCAL_TMP_DIR"
  ensure_local_tools

  echo "Creating local catalog export database..."
  docker exec -i "$LOCAL_CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U "$DB_USER" -P "$DB_PASSWORD" -C -b -v SourceDb="$DB_NAME" -i /dev/stdin <<'SQL'
SET NOCOUNT ON;
IF DB_ID(N'catalog_export') IS NOT NULL
BEGIN
  ALTER DATABASE catalog_export SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  DROP DATABASE catalog_export;
END;
CREATE DATABASE catalog_export;
GO
USE catalog_export;
GO
CREATE TABLE dbo.TCG (
    id INT NOT NULL PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    cardMarketName NVARCHAR(100) NULL
);
CREATE TABLE dbo.Expansion (
    id INT NOT NULL PRIMARY KEY,
    tcg_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(255) NULL,
    cardMarketExpansionId INT NULL,
    cardMarketExpansionCode NVARCHAR(255) NULL,
    release_date DATE NULL
);
CREATE TABLE dbo.Card (
    id INT NOT NULL PRIMARY KEY,
    expansion_id INT NOT NULL,
    tcg_id INT NULL,
    cardMarketId INT NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    number NVARCHAR(50) NULL,
    rarity NVARCHAR(50) NULL,
    image_url NVARCHAR(255) NULL,
    card_url NVARCHAR(255) NULL,
    last_updated DATETIME NOT NULL
);
ALTER TABLE dbo.Expansion ADD CONSTRAINT FK_Expansion_TCG FOREIGN KEY (tcg_id) REFERENCES dbo.TCG(id);
ALTER TABLE dbo.Card ADD CONSTRAINT FK_Card_Expansion FOREIGN KEY (expansion_id) REFERENCES dbo.Expansion(id);
ALTER TABLE dbo.Card ADD CONSTRAINT FK_Card_TCG FOREIGN KEY (tcg_id) REFERENCES dbo.TCG(id);
GO
INSERT INTO catalog_export.dbo.TCG (id, name, cardMarketName)
SELECT id, name, cardMarketName FROM [$(SourceDb)].dbo.TCG;
INSERT INTO catalog_export.dbo.Expansion (id, tcg_id, name, code, cardMarketExpansionId, cardMarketExpansionCode, release_date)
SELECT id, tcg_id, name, code, cardMarketExpansionId, cardMarketExpansionCode, release_date FROM [$(SourceDb)].dbo.Expansion;
INSERT INTO catalog_export.dbo.Card (id, expansion_id, tcg_id, cardMarketId, name, number, rarity, image_url, card_url, last_updated)
SELECT id, expansion_id, tcg_id, cardMarketId, name, number, rarity, image_url, card_url, last_updated FROM [$(SourceDb)].dbo.Card;
GO
SQL

  echo "Exporting catalog tables to bacpac..."
  docker exec "$LOCAL_CONTAINER" rm -f "/tmp/$ARCHIVE_NAME"
  docker exec "$LOCAL_CONTAINER" /opt/mssql-tools18/bin/sqlpackage \
    /Action:Export \
    /SourceServerName:localhost \
    /SourceDatabaseName:catalog_export \
    /SourceUser:"$DB_USER" \
    /SourcePassword:"$DB_PASSWORD" \
    /TargetFile:"/tmp/$ARCHIVE_NAME" \
    /SourceTrustServerCertificate:True \
    /Quiet:True
  docker cp "$LOCAL_CONTAINER:/tmp/$ARCHIVE_NAME" "$LOCAL_TMP_DIR/$ARCHIVE_NAME"
  echo "Wrote $LOCAL_TMP_DIR/$ARCHIVE_NAME"
}

upload_remote() {
  echo "Uploading $LOCAL_TMP_DIR/$ARCHIVE_NAME to $REMOTE_HOST:$REMOTE_PATH/"
  scp "$LOCAL_TMP_DIR/$ARCHIVE_NAME" "$REMOTE_HOST:$REMOTE_PATH/$ARCHIVE_NAME"
}

import_remote() {
  require_passwords
  ensure_remote_tools

  echo "Copying bacpac into VPS SQL container..."
  ssh "$REMOTE_HOST" "docker cp '$REMOTE_PATH/$ARCHIVE_NAME' '$REMOTE_CONTAINER:/tmp/$ARCHIVE_NAME'"

  echo "Importing bacpac into temporary VPS database..."
  ssh "$REMOTE_HOST" "docker exec '$REMOTE_CONTAINER' /opt/mssql-tools18/bin/sqlcmd -S localhost -U '$DB_USER' -P '$REMOTE_DB_PASSWORD' -C -b -Q \"IF DB_ID(N'catalog_import') IS NOT NULL BEGIN ALTER DATABASE catalog_import SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE catalog_import; END\""
  ssh "$REMOTE_HOST" "docker exec '$REMOTE_CONTAINER' /opt/mssql-tools18/bin/sqlpackage /Action:Import /TargetServerName:localhost /TargetDatabaseName:catalog_import /TargetUser:'$DB_USER' /TargetPassword:'$REMOTE_DB_PASSWORD' /SourceFile:/tmp/$ARCHIVE_NAME /TargetTrustServerCertificate:True /Quiet:True"

  echo "Merging catalog tables into VPS $DB_NAME database..."
  ssh "$REMOTE_HOST" "docker exec -i '$REMOTE_CONTAINER' /opt/mssql-tools18/bin/sqlcmd -S localhost -U '$DB_USER' -P '$REMOTE_DB_PASSWORD' -C -b -v TargetDb='$DB_NAME' -i /dev/stdin" <<'SQL'
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

SET IDENTITY_INSERT [$(TargetDb)].dbo.TCG ON;

MERGE [$(TargetDb)].dbo.TCG AS target
USING catalog_import.dbo.TCG AS source
ON target.id = source.id
WHEN MATCHED THEN UPDATE SET
  name = source.name,
  cardMarketName = source.cardMarketName
WHEN NOT MATCHED BY TARGET THEN
  INSERT (id, name, cardMarketName)
  VALUES (source.id, source.name, source.cardMarketName);

SET IDENTITY_INSERT [$(TargetDb)].dbo.TCG OFF;

SET IDENTITY_INSERT [$(TargetDb)].dbo.Expansion ON;

MERGE [$(TargetDb)].dbo.Expansion AS target
USING catalog_import.dbo.Expansion AS source
ON target.id = source.id
WHEN MATCHED THEN UPDATE SET
  tcg_id = source.tcg_id,
  name = source.name,
  code = source.code,
  cardMarketExpansionId = source.cardMarketExpansionId,
  cardMarketExpansionCode = source.cardMarketExpansionCode,
  release_date = source.release_date
WHEN NOT MATCHED BY TARGET THEN
  INSERT (id, tcg_id, name, code, cardMarketExpansionId, cardMarketExpansionCode, release_date)
  VALUES (source.id, source.tcg_id, source.name, source.code, source.cardMarketExpansionId, source.cardMarketExpansionCode, source.release_date);

SET IDENTITY_INSERT [$(TargetDb)].dbo.Expansion OFF;

SET IDENTITY_INSERT [$(TargetDb)].dbo.Card ON;

MERGE [$(TargetDb)].dbo.Card AS target
USING catalog_import.dbo.Card AS source
ON target.cardMarketId = source.cardMarketId
WHEN MATCHED THEN UPDATE SET
  expansion_id = source.expansion_id,
  tcg_id = source.tcg_id,
  name = source.name,
  number = source.number,
  rarity = source.rarity,
  image_url = source.image_url,
  card_url = source.card_url,
  last_updated = source.last_updated
WHEN NOT MATCHED BY TARGET THEN
  INSERT (id, expansion_id, tcg_id, cardMarketId, name, number, rarity, image_url, card_url, last_updated)
  VALUES (source.id, source.expansion_id, source.tcg_id, source.cardMarketId, source.name, source.number, source.rarity, source.image_url, source.card_url, source.last_updated);

SET IDENTITY_INSERT [$(TargetDb)].dbo.Card OFF;

COMMIT TRANSACTION;

SELECT 'TCG' AS table_name, COUNT(*) AS rows_in_target FROM [$(TargetDb)].dbo.TCG
UNION ALL SELECT 'Expansion', COUNT(*) FROM [$(TargetDb)].dbo.Expansion
UNION ALL SELECT 'Card', COUNT(*) FROM [$(TargetDb)].dbo.Card;
SQL

  echo "Cleaning temporary VPS import database..."
  ssh "$REMOTE_HOST" "docker exec '$REMOTE_CONTAINER' /opt/mssql-tools18/bin/sqlcmd -S localhost -U '$DB_USER' -P '$REMOTE_DB_PASSWORD' -C -b -Q \"ALTER DATABASE catalog_import SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE catalog_import;\""
}

main() {
  local action="${1:-all}"
  case "$action" in
    -h|--help|help) usage ;;
    export) export_local ;;
    upload) upload_remote ;;
    import) import_remote ;;
    all) export_local; upload_remote; import_remote ;;
    *) echo "Unknown action: $action" >&2; usage >&2; exit 2 ;;
  esac
}

main "$@"
