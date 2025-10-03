import { computed } from "vue";

import { type ModelGroup, type ModelItem } from "@/agents/types";
import { useConfigStore } from "@/stores/config";

type Variant = "float" | "chat" | "renaming";
type AugmentedModelItem = ModelItem & { icon: ModelGroup["icon"] };
type GroupWithIcons = Omit<ModelGroup, "items"> & {
  items: AugmentedModelItem[];
};

export const useSelector = (variant: Variant) => {
  const configStore = useConfigStore();

  const modelId = computed<string>({
    get() {
      switch (variant) {
        case "float":
          return configStore.floatModel;
        case "renaming":
          return configStore.renamingModel;
        case "chat":
          return configStore.agentsModel;
        default:
          throw new Error(`Unknown variant: ${variant}`);
      }
    },
    set(value: string) {
      switch (variant) {
        case "float":
          configStore.floatModel = value;
          break;
        case "renaming":
          configStore.renamingModel = value;
          break;
        case "chat":
          configStore.agentsModel = value;
          break;
        default:
          throw new Error(`Unknown variant: ${variant}`);
      }
    },
  });

  const groups = computed<GroupWithIcons[]>(() =>
    configStore.models
      .map((group) => {
        const filteredItems = group.items
          .filter(
            (item) => item.onlyFor === undefined || item.onlyFor === variant,
          )
          .map((item) => ({ ...item, icon: group.icon }));

        return {
          label: group.label,
          icon: group.icon,
          items: filteredItems,
        };
      })
      .filter((group) => group.items.length > 0),
  );

  const selectedModel = computed<AugmentedModelItem | undefined>(() => {
    const group = groups.value.find((g) =>
      g.items.some((i) => i.id === modelId.value),
    );
    if (group === undefined) return undefined;
    const item = group.items.find((i) => i.id === modelId.value);
    return item;
  });

  const isCustomModel = computed<boolean>(() => {
    return selectedModel.value === undefined && modelId.value !== "";
  });

  return {
    modelId,
    groups,
    selectedModel,
    isCustomModel,
  };
};
