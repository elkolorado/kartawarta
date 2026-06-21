#!/bin/bash

# Start Docker container
docker start sqlserver &

# Run Backend
nohup ./venv/bin/python kartawarta-backend/initialize.py > backend.log 2>&1 &
nohup ./venv/bin/python kartawarta-vision-backend/initialize.py > vision.log 2>&1 &

# Schedule data collection to run every day at 04:00 using cron
(crontab -l 2>/dev/null; echo "0 4 * * * cd $(pwd) && ./venv/bin/python kartawarta-backend/dataingestion.py -s riftbound > dataingestion_riftbound.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 4 * * * cd $(pwd) && ./venv/bin/python kartawarta-backend/dataingestion.py -s dbs > dataingestion_dbs.log 2>&1") | crontab -

