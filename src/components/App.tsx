import { useRouter, RouterProvider } from "@/router";
import { matchRoute } from "@/router/routes";
import reactLogoAsset from "@/assets/react.svg";
import { useState } from "react";

const reactLogo = typeof window !== "undefined" ? reactLogoAsset : "/assets/react.svg";

export function App() {
  return (
    <RouterProvider matchRoute={matchRoute}>
      <AppContent />
    </RouterProvider>
  );
}

function AppContent() {
  const { isNavigating, route } = useRouter();
  const [num, setNum] = useState(0);

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
      <button onClick={() => setNum(num + 1)}>Count</button>
      <div>{num}</div>
      <a href="/users/duke">Duke</a>
      <main>{content}</main>
    </div>
  );
}

export default App;
