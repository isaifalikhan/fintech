import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { initDataStore } from "./services/dataStore";
import "./styles/index.css";

async function bootstrap() {
  await initDataStore();
  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
}

void bootstrap();
  