import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadGarments } from "./garments/loading";

preloadGarments(location.pathname);
createRoot(document.getElementById("root")!).render(<App />);
