import { bindButtonPressFeedback } from "../../../../shared/site/buttonPressFeedback";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "../../../../shared/site/buttons.css";
import { preloadGarments } from "./garments/loading";

preloadGarments(location.pathname);
bindButtonPressFeedback(document);

createRoot(document.getElementById("root")!).render(<App />);
