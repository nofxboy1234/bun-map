// import { useRouter, RouterProvider } from "@/router";
// import { matchRoute } from "@/router/routes";
// import reactLogoAsset from "@/assets/react.svg";
// import { useState } from "react";

// const reactLogo = typeof window !== "undefined" ? reactLogoAsset : "/assets/react.svg";

// export function App() {
//   return (
//     <RouterProvider matchRoute={matchRoute}>
//       <AppContent />
//     </RouterProvider>
//   );
// }

// function AppContent() {
//   const { isNavigating, route } = useRouter();
//   const [num, setNum] = useState(0);

//   let content;

//   if (route) {
//     const Component = route.component;

//     content = <Component />;
//   } else {
//     content = <div>Not Found</div>;
//   }

//   return (
//     <div className={`app-container ${isNavigating ? "navigating" : ""}`}>
//       <header>
//         <h1>⚡ Bun Router Demo</h1>
//         {isNavigating && <div className="loading-bar" />}
//       </header>
//       <img src={reactLogo} alt="react logo" width={"100px"} />
//       <button onClick={() => setNum(num + 1)}>Count</button>
//       <div>{num}</div>
//       <a href="/users/duke">Duke</a>
//       <main>{content}</main>
//     </div>
//   );
// }

// export default App;

import { APITester } from "./APITester";
import "@/index.css";

import logo from "@/assets/logo.svg";
import reactLogo from "@/assets/react.svg";

export function App() {
  return (
    <div className="app">
      <div className="logo-container">
        <img src={logo} alt="Bun Logo" className="logo bun-logo" />
        <img src={reactLogo} alt="React Logo" className="logo react-logo" />
      </div>

      <h1>Bun + React</h1>
      <p>
        Edit <code>src/components/App.tsx</code> and save to test HMR
      </p>
      <APITester />
    </div>
  );
}

export default App;
