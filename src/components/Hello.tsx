import reactLogoAsset from "@/assets/react.svg";

const reactLogo = typeof window !== "undefined" ? reactLogoAsset : "/assets/react.svg";

export function Hello() {
  return (
    <div>
      <img src={reactLogo} alt="react logo" width={"100px"} />
    </div>
  );
}
