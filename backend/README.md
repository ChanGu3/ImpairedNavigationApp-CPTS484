# FOR RUNNING BACKEND

## First Time Setup

- Step 1: Install python
- Step 2: Create python virtual environment in backend directory by doing it inside of that directory -> [ python -m venv "nameofenv" ]
  - (Note: this will generate a directory structure inside backend for env with name specified)
- Step 3: Activate the virtual environment using the path from the directory structure if on windows -> [ .\nameofenv\Scripts\activate ]
  - (Note: otherwise use another process for activating the python virtual environment)
- Step 4: Install the current python package dependencies -> [ pip install -r requirements.txt ]
- Step 5: Look at "Subsequent Usage" below

## How To Install Packages Safely For Everyone

- Step 1: first install the package -> [ pip install "package name" ]
- Step 2: Make sure all the requirements.txt packages are installed  -> [ pip install -r requirements.txt ]
  - (NOTE: if you do not do this packages may be lost during freeze in next step unless you know for sure you have everything installed in your python virtual environment from the current requirements.txt)
- Step 3: Add the installed package to the requirements.txt by doing -> [ pip freeze > requirements.txt ]
  - (NOTE: if you do not do this everyone cannot get the packages easily by doing [ pip install -r requirements.txt ] otherwise they will have to install each on their own by errors and looking through files)

## Subsequent Usage

- Step 1: Make sure all the dependencies are downloaded before running backend server -> [ pip install -r requirements.txt ]
- Step 2: then run the server using -> [ python app.py ]
  - (Note: this means your done and the server is running logs should be in the terminal for server information )
