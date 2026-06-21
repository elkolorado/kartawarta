# Kartawarta.pl Backend

## Prerequisites

Preferably container of SQL 
```
mcr.microsoft.com/mssql/server:2025-latest
```

## Setup




### Instal deps:
```
pip install -r requirements.txt
```

### Configure the .env
```
DB_PASSWORD = pass
DB_USER = sa
DB_SERVER = localhost
DB_PORT = 1433
DB_DATABASE = cardmarket
JWT_SECRET_KEY = your_default_secret_key
```

### Run schema
```
python db/prepare_db.py
```

### Run app
```
python initalize.py
```





