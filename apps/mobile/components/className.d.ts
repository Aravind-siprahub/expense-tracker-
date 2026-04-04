import type { ComponentType, ReactNode } from "react";

// Augments react-native component props with className so @repo/ui components
// type-check correctly in both Next.js (react-native-web) and Expo (NativeWind).
//
// Also re-declares Pressable here because react-native-web (the webpack alias
// target for react-native in Next.js) does not expose Pressable in its TypeScript
// definitions even though it exists at runtime.
declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }

  // Pressable is missing from react-native-web's type exports —
  // declare it here so the web build type-checks correctly.
  const Pressable: ComponentType<{
    children?: ReactNode;
    className?: string;
    onPress?: () => void;
    disabled?: boolean;
    style?: unknown;
  }>;
}
