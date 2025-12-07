# ImpairedNavigationApp-CPTS484

## How To Run Backend And Front End

### Prerequisites
- Python 3.x installed
- Node.js and npm installed

### Backend Setup
1. **Create and activate virtual environment** (if not already created):
   ```powershell
   cd ImpairedNavigationApp-CPTS484
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

2. **Install dependencies** (first time only):
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```

3. **Run the backend**:
   ```powershell
   cd ImpairedNavigationApp-CPTS484\backend 
   & ..\.venv\Scripts\python.exe app.py
   ```

### Frontend Setup
1. **Install dependencies** (first time only):
   ```powershell
   cd ImpairedNavigationApp-CPTS484\frontend\mobile\theia-app
   npm install
   ```

2. **Run the frontend**:
   ```powershell
   cd ImpairedNavigationApp-CPTS484\frontend\mobile\theia-app
   npm start
   ```

### Important Notes
- **Always run the backend first**, then the frontend, as the frontend depends on the backend for data
- The backend runs on `http://localhost:5000`
- The frontend runs on `http://localhost:8081`
- Test the connection between backend and frontend by visiting `http://localhost:8081/test` when both are running

## Two Hard Coded Accounts

- [Impaired User]: (email: janedoe@fake.com), (password: password)
- [Caretaker User]: (email: philjonas@fake.com), (password: password)

## Phase I

[WRS Document](https://docs.google.com/document/d/1SKOx4pVtJpnDJBEPfgIDKMMI0HnByeWO/edit?usp=sharing&ouid=102567847160307486796&rtpof=true&sd=true)

[Phase I Plan](https://docs.google.com/document/d/1SI8Uw15qcMJvHyvmoiBQDva31txuJZWgnXk7DnCwYI4/edit?usp=sharing)

[Meeting Records](https://docs.google.com/document/d/1_3he3sh-UspiOWekKEW_aaeWJNYgK7A1Mco9xot_GEQ/edit?usp=sharing)

[Presentation Slides](https://docs.google.com/presentation/d/1e-DEe4WLCm1o4s8OL5IBoqSaLINoCK_0/edit?usp=sharing&ouid=102567847160307486796&rtpof=true&sd=true)

## Phase II
