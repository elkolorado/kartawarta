# Kartawarta


# Setup


## Environment

For now use venv
```
python -m venv venv
source venv/Scripts/activate
```

## Requirements
Instal dependencies for each service
```bash
python -m pip install -r kartawarta-backend/requirements.txt
python -m pip install -r kartawarta-vision-backend/requirements.txt
npm --prefix kartawarta-frontend i
```
## Database

Preferably use `docker` to get the `mcr.microsoft.com/mssql/server:2025-latest`, and setup it with 
```bash
DB_PASSWORD = password
DB_USER = sa
DB_SERVER = localhost
DB_PORT = 1433
```

Ensure it is running.

### Prefil database with sample user & TCG entry
Run
```bash
python kartawarta-backend/db/prepare_db.py
```

## Data ingestion
Perform ingestion for your TCG. `riftbound for dev`
```bash
python kartawarta-backend/dataingestion.py -s riftbound
```

# Start services
```bash
python kartawarta-backend/initialize.py
```

```bash
python kartawarta-vision-backend/initialize.py
```

```bash
npm --prefix kartawarta-frontend start
```

# Architecture
```mermaid
graph TB
    %% --- Warstwa Logiki ---
    subgraph Mikroserwisy [Warstwa Mikroserwisów]
        subgraph Klient [Brama i Zarządzanie Ruchem]
            api[Brama API]
            lb{Load Balancer}
            U[Aplikacja Klienta]
            provider[Dostawca Tożsamości]
            provider<-->api
        end

        direction TB
                subgraph Przetwarzanie [Warstwa Przetwarzania]
            subgraph SerwisPrzetwarzania [Serwis Analityczny Obrazu]
                DESCRIPTOR_ENGINE(Ekstraktor Deskryptorów)
            end

            subgraph DostawcyDanych [Serwis Integracji Danych]
                SCR_CM(Zewnętrzne Źródła Danych)
            end
        end
        subgraph Serwowanie [Warstwa Serwowania]
            subgraph SerwisGlowny [Serwis Użytkownika]
                B_AUTH(Logika Biznesowa)
            end

            subgraph SerwisCV [Serwis Rozpoznawania]
                B_MATCH(Silnik Porównywania Cech)
            end
        end


    end

    %% --- Warstwa Danych ---
    subgraph WarstwaDanych [Warstwa Przechowywania Danych]
        direction LR
        IDX_1[(Indeksy Wektorowe)]
        DB_MAIN[(Relacyjna Baza Danych)]
        V_IMAGES[(Magazyn obrazów)]
    end

    %% --- Przepływy ---
    api <--> B_AUTH
    api <--> B_MATCH
    B_MATCH --- IDX_1
    lb-->api
    U-->lb
    
    B_AUTH <--> DB_MAIN

    SCR_CM --> DB_MAIN
    DESCRIPTOR_ENGINE --> IDX_1
    --- V_IMAGES
    SCR_CM --> V_IMAGES
    B_AUTH --- V_IMAGES
    SCR_CM --> DESCRIPTOR_ENGINE
    


    %% --- Stylizacja ---
    style Klient fill:#f5f5f5,stroke:#333
    style Mikroserwisy fill:#ffffff,stroke:#333,stroke-dasharray: 5 5
    style SerwisGlowny fill:#e3f2fd,stroke:#2196f3
    style SerwisCV fill:#ffebee,stroke:#f44336
    style SerwisPrzetwarzania fill:#fff3e0,stroke:#ff9800
    style DostawcyDanych fill:#f1f8e9,stroke:#4caf50
    style WarstwaDanych fill:#fafafa,stroke:#ff9800,stroke-width:2px

```






