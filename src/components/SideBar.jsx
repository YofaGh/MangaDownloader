import { SideBarButton } from ".";

export default function SideBar() {
  return (
    <div className="sidebar">
      <SideBarButton svgName="home" pathName="/" />
      <SideBarButton svgName="library" />
      <SideBarButton svgName="search" />
      <SideBarButton svgName="dPage" pathName="download" />
      <SideBarButton svgName="module" pathName="modules" />
      <SideBarButton svgName="heart" pathName="favorites" />
      <SideBarButton svgName="saucer" />
      <SideBarButton svgName="about" style={{ marginTop: "auto" }} />
      <SideBarButton
        svgName="settings"
        style={{ marginBottom: "40px" }}
        className="buttonh buttonhg"
      />
    </div>
  );
}
