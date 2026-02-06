#!/bin/sh
export TEST_SIDECAR_ENDPOINT="http://localhost:8090"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export PORT=8000

poetry run python src/entity/main.py
