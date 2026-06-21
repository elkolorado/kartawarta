FROM python:3.12-alpine

WORKDIR /app
RUN pip install --no-cache-dir docker prometheus-client
COPY exporter.py /app/exporter.py

EXPOSE 9100
CMD ["python", "/app/exporter.py"]
