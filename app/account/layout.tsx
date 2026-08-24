import AvatarCropEnhancer from "./AvatarCropEnhancer";

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><AvatarCropEnhancer />{children}</>;
}
