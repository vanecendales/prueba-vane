#!/bin/bash

ETL_FOLDER="download-and-convert-gdocs"
TEX_FOLDER="my-awesome-cv"


# 0. Build a docker Image
cd $ETL_FOLDER
docker build -t gdocs .
cd ..


# 1. Download and convert Google Doc File into a *tex files with the built docker image
docker run --name etl_python --rm -i -w "/app" -v "$PWD":/app gdocs python3 $ETL_FOLDER/main.py


# 2. Render pdf
cd $TEX_FOLDER
docker run --rm --user $(id -u):$(id -g) -i -w "/doc" -v "$PWD":/doc thomasweise/docker-texlive-thin make

