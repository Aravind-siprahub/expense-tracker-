/// <reference path="./className.d.ts" />
import { Pressable, Text } from "react-native";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled = false }: ButtonProps) {
  const base = "rounded-lg px-4 py-2 items-center justify-center";
  const styles = {
    primary: "bg-blue-600 active:bg-blue-700",
    secondary: "bg-gray-100 active:bg-gray-200",
  };
  const textStyles = {
    primary: "text-white font-semibold text-sm",
    secondary: "text-gray-800 font-semibold text-sm",
  };

  return (
    <Pressable
      className={`${base} ${styles[variant]} ${disabled ? "opacity-50" : ""}`}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className={textStyles[variant]}>{label}</Text>
    </Pressable>
  );
}
