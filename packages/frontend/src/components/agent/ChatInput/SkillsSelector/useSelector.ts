import { useEventListener, useResizeObserver, useScroll } from "@vueuse/core";
import { computed, nextTick, ref, watch } from "vue";

import { useSession } from "../../useSession";

import { useSkillsStore } from "@/stores/skills";

export const useSelector = () => {
  const skillsStore = useSkillsStore();
  const session = useSession();

  const selectedSkillIds = computed({
    get() {
      return session.store.selectedSkillIds;
    },
    set(value: string[]) {
      session.store.setSelectedSkillIds(value);
    },
  });

  const skillOptions = computed(() => skillsStore.skills);

  const isSelected = (id: string) => selectedSkillIds.value.includes(id);

  const toggleSkill = (id: string) => {
    session.store.toggleSkill(id);
  };

  const selectedSkills = computed(() =>
    selectedSkillIds.value
      .map((id) => skillOptions.value.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined)
  );

  const listRef = ref<HTMLDivElement | undefined>(undefined);
  const hasOverflow = ref(false);
  const { arrivedState } = useScroll(listRef);
  const showLeft = computed(() => hasOverflow.value && !arrivedState.left);
  const showRight = computed(() => hasOverflow.value && !arrivedState.right);

  const updateOverflow = () => {
    const el = listRef.value;
    if (el === undefined) {
      hasOverflow.value = false;
      return;
    }
    hasOverflow.value = el.scrollWidth - el.clientWidth > 1;
  };

  const onScroll = () => updateOverflow();

  const scrollByAmount = (amount: number) => {
    const el = listRef.value;
    if (el !== undefined) {
      el.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const scrollLeftBy = () => {
    const el = listRef.value;
    scrollByAmount(-((el?.clientWidth ?? 200) * 0.8));
  };

  const scrollRightBy = () => {
    const el = listRef.value;
    scrollByAmount((el?.clientWidth ?? 200) * 0.8);
  };

  let stopWindowListener: (() => void) | undefined;
  const bindScrollHandlers = () => {
    const el = listRef.value;
    if (el !== undefined) {
      el.addEventListener("scroll", onScroll);
    }
    if (stopWindowListener === undefined) {
      stopWindowListener = useEventListener(window, "resize", updateOverflow);
    }
    requestAnimationFrame(() => {
      updateOverflow();
      if (hasOverflow.value && el !== undefined) {
        el.scrollTo({ left: el.scrollWidth, top: 0, behavior: "auto" });
      }
    });
  };

  const unbindScrollHandlers = () => {
    const el = listRef.value;
    if (el !== undefined) {
      el.removeEventListener("scroll", onScroll);
    }
    if (stopWindowListener !== undefined) {
      stopWindowListener();
      stopWindowListener = undefined;
    }
  };

  useResizeObserver(listRef, () => updateOverflow());
  watch(
    selectedSkills,
    async () => {
      await nextTick();
      updateOverflow();
      const el = listRef.value;
      if (hasOverflow.value && el !== undefined) {
        el.scrollTo({ left: el.scrollWidth, top: 0, behavior: "auto" });
      }
    },
    { immediate: true }
  );

  return {
    selectedSkillIds,
    skillOptions,
    isSelected,
    toggleSkill,
    selectedSkills,
    listRef,
    showLeft,
    showRight,
    hasOverflow,
    scrollLeftBy,
    scrollRightBy,
    bindScrollHandlers,
    unbindScrollHandlers,
  };
};
