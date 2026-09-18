import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { View, StyleSheet } from "react-native";
import type { CategoryIconName } from "@/constants/categories";

type Props = {
  name: CategoryIconName;
  color: string;
  size?: number;
  containerSize?: number;
};

export function CategoryIcon({ name, color, size = 22, containerSize = 44 }: Props) {
  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: `${color}1A`,
          borderColor: `${color}38`,
        },
      ]}
    >
      <MaterialIcons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
