import { useRouter, RouterProvider } from "@/router";
import { matchRoute } from "@/router/routes";
import "@/index.css";

const reactLogo = "/assets/react.svg";

if (import.meta.hot) {
  import.meta.hot.accept();
}

export function App() {
  return (
    <RouterProvider matchRoute={matchRoute}>
      <AppContent />
    </RouterProvider>
  );
}

function AppContent() {
  const { path, isNavigating } = useRouter();
  const route = matchRoute(path);

  let content;
  if (route) {
    const Component = route.component;
    content = <Component />;
  } else {
    content = <div>Not Found</div>;
  }

  return (
    <div className={`app-container ${isNavigating ? "navigating" : ""}`}>
      <header>
        <h1>⚡ Bun Router Demo</h1>
        {isNavigating && <div className="loading-bar" />}
      </header>
      <img src={reactLogo} alt="react logo" width={"100px"} />
      <main>{content}</main>
    </div>
  );
}

export default App;
