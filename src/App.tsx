import { APITester } from "./APITester";
import "./index.css";

const logo = "/src/logo.svg";
const reactLogo = "/src/react.svg";

console.log("App.tsx evaluating");

if (import.meta.hot) {
  import.meta.hot.accept();
}

export function App() {
  return (
    <div className="app">
      <div className="logo-container">
        <img src={logo} alt="Bun Logo" className="logo bun-logo" />
        <img src={reactLogo} alt="React Logo" className="logo react-logo" />
      </div>

      <h1>Bun + React!</h1>
      <p>
        Edit <code>src/App.tsx</code> and save to test HMR
      </p>
      <APITester />
    </div>
  );
}

export default App;
