<script setup lang="ts">
import Card from "primevue/card";
import Button from "primevue/button";
import { ref } from "vue";
import type { FrontendSDK } from "@/types";
import { getPluginStorage, setPluginStorage } from '../../utils/caidoUtils';

const props = defineProps<{
  caido: FrontendSDK;
  isAuthenticated: boolean;
}>();

const emit = defineEmits<{
  authenticated: [];
}>();

const isFetching = ref(false);

const handleAuthenticate = async () => {
  isFetching.value = true;
  const auth = JSON.parse(localStorage.getItem("CAIDO_AUTHENTICATION") || "{}");
  const accessToken = auth.accessToken;
  if (!accessToken) {
    props.caido.window.showToast("Error: No access token found", {
      variant: "error"
    });
    return;
  }

  try {
    const response = await props.caido.backend.authenticate(accessToken);
    switch (response.kind) {
      case "Success":
        props.caido.window.showToast("Authentication successful", {
          variant: "success"
        })

        const storage = await getPluginStorage(props.caido);
        storage.apiKey = response.api_key;
        await setPluginStorage(props.caido, storage);
        emit('authenticated');
        break;
      case "Error":
        props.caido.window.showToast(response.error, {
          variant: "error"
        });
        break;
    }
  } catch (error) {
    props.caido.window.showToast(error as string, {
      variant: "error"
    });
  } finally {
    isFetching.value = false;
  }
};
</script>

<template>
  <Card
    class="h-full"
    :pt="{
      body: { class: 'h-full p-0' },
      content: {
        class: 'h-full flex flex-col justify-center items-center p-8',
      },
    }"
  >
    <template #content>
      <div class="flex flex-col items-center gap-8 text-center">
        <div class="flex flex-col items-center">
          <h1 class="text-4xl font-bold">Get Started with Shift</h1>
          <p class="text-lg text-gray-400 leading-relaxed" style="width: 400px">
            Shift is a quick and easy way to query AI within Caido. Shift can
            take actions for you like creating M&R rules, modifying the HTTQL
            bar, and much more.
          </p>
        </div>

        <div>
          <Button @click="handleAuthenticate" size="large" :loading="isFetching">
            Authenticate
          </Button>
        </div>
      </div>
    </template>
  </Card>
</template>
