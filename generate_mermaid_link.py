import base64
import json

mermaid_code = """graph TB
    %% Class Definitions
    classDef client fill:#e0f2fe,stroke:#0ea5e9,stroke-width:2px,color:#0369a1;
    classDef api fill:#f5f3ff,stroke:#8b5cf6,stroke-width:2px,color:#5b21b6;
    classDef service fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef ai fill:#fff7ed,stroke:#f59e0b,stroke-width:2px,color:#9a3412;
    classDef data fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46;

    subgraph Client_Layer ["💻 Client Layer (Frontend)"]
        ReactApp["React & Vite Application"]:::client
        UI_Components["Premium UI (Vanilla CSS)"]:::client
        State_Mgmt["LocalState & LocalStorage"]:::client
        ReactApp --> UI_Components
        ReactApp --> State_Mgmt
    end

    subgraph API_Layer ["⚙️ API Layer (Backend)"]
        FastAPI["FastAPI Server"]:::api
        Routers["REST Endpoints / SSE"]:::api
        Services["Core Services Logic"]:::api
        FastAPI --> Routers
        Routers --> Services
    end

    subgraph Service_Logic ["🧠 Business Logic Services"]
        ResumeService["Resume Analysis Service"]:::service
        InterviewService["AI Interview Engine"]:::service
        AptitudeService["Aptitude Testing System"]:::service
        ChatService["Context-Aware AI Chat"]:::service
        JobAggregator["Job & Course Hub"]:::service
        
        Services --> ResumeService
        Services --> InterviewService
        Services --> AptitudeService
        Services --> ChatService
        Services --> JobAggregator
    end

    subgraph Intelligence_Layer ["🤖 Intelligence Layer (AI)"]
        GeminiAI["Google Gemini 2.5 Flash"]:::ai
        PDFParser["PDF Parsing Engine (PyMuPDF)"]:::ai
        
        ResumeService --> PDFParser
        ResumeService --> GeminiAI
        InterviewService --> GeminiAI
        ChatService --> GeminiAI
        JobAggregator --> GeminiAI
    end

    subgraph Data_Persistence ["💾 Data Layer"]
        SQLite["SQLite Database (SQLModel)"]:::data
        QuestionBank["Aptitude Question Bank"]:::data
        UserData["Interview & User Records"]:::data
        
        SQLite --- QuestionBank
        SQLite --- UserData
        AptitudeService --> SQLite
        InterviewService --> SQLite
    end

    %% Interactions
    UI_Components -- "HTTP (JSON)" --> Routers
    ChatService -- "SSE (Streaming)" --> UI_Components

    %% Applying Classes
    class Client_Layer client;
    class API_Layer api;
    class Service_Logic service;
    class Intelligence_Layer ai;
    class Data_Persistence data;"""

state = {
    "code": mermaid_code,
    "mermaid": json.dumps({"theme": "default"}),
    "autoSync": True,
    "updateDiagram": True,
    "updateEditor": True,
    "loaderSpec": {
        "type": "mermaid",
        "config": {
            "theme": "default"
        }
    }
}

json_str = json.dumps(state)
encoded = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
print(f"URL_START_LINK: https://mermaid.live/view#base64:{encoded} :URL_END_LINK")
