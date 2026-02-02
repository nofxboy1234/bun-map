import { useRouter } from "./simple-router";
import { matchRoute } from "./routes";
import "./index.css";

if (import.meta.hot) {
  import.meta.hot.accept();
}

export function App() {
  const { path } = useRouter();
  const route = matchRoute(path);

  let content;
  if (route) {
    const Component = route.component;
    content = <Component />;
  } else {
    content = <div>Not Found</div>;
  }

  return (
    <div className="app-container">
      <header>
        <h1>⚡ Bun Router Demo</h1>
      </header>
      <main>{content}</main>
    </div>
  );
}

export default App;
