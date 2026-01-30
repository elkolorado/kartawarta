import pymssql
import os
import bcrypt
from dotenv import load_dotenv
load_dotenv()

DB_CONFIG = {
    'server': os.getenv('DB_SERVER'),
    'port': os.getenv('DB_PORT'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_DATABASE', 'cardmarket'),
    'jwt_secret_key': os.getenv('JWT_SECRET_KEY', 'your_default_secret_key')
}


def get_connection():
    return pymssql.connect(
        server=DB_CONFIG['server'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        autocommit=True
    )


def prepare_database():
    conn = get_connection()
    cursor = conn.cursor()

    # check if db exist
    cursor.execute(
        "SELECT name FROM master.dbo.sysdatabases WHERE name = %s",
        (DB_CONFIG["database"],)
    )
    if cursor.fetchone():
        print(f"Database '{DB_CONFIG['database']}' already exists.")
        return
    # Create database
    cursor.execute(f"CREATE DATABASE {DB_CONFIG['database']}")
    print(f"Database '{DB_CONFIG['database']}' created.")

    # switch to the new database
    cursor.execute(f"USE {DB_CONFIG['database']}")

    # run db schema
    print("Running database schema...")
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(BASE_DIR, 'db_schema.sql')
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
    cursor.execute(schema_sql)

    # insert default user
    print("Inserting default user...")
    password = "123"
    # hash password with jwt_secret_key
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
# convert to string for SQL insert
    hashed_str = hashed.decode("utf-8")

    cursor.execute("""
        INSERT INTO [User] (username, password_hash, email, provider, provider_id)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        '123',
        hashed_str,
        'admin@example.com',
        'local',
        1
    ))

    # 4. Insert TCG Data
    print("Populating TCG table...")
    tcg_data = [
        (1, 'Dragon Ball Fusion World', 'DragonBallSuper'),
        (3, 'One Piece', 'OnePiece'),
        (4, 'Magic: The Gathering', 'Magic'),
        (5, 'Riftbound', 'Riftbound'),
        (1006, 'Pokemon', 'Pokemon'),
        (1007, 'Digimon', 'Digimon')
    ]

    # Enable explicit ID insertion for IDENTITY columns
    cursor.execute("SET IDENTITY_INSERT [TCG] ON")
    
    insert_tcg_query = "INSERT INTO [TCG] (id, name, cardMarketName) VALUES (%s, %s, %s)"
    cursor.executemany(insert_tcg_query, tcg_data)
    
    cursor.execute("SET IDENTITY_INSERT [TCG] OFF")

    cursor.close()


if __name__ == "__main__":
    prepare_database()
    print("Database preparation completed.")
