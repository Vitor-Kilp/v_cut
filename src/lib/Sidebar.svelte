<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar";
  import Settings from "@lucide/svelte/icons/settings";
  import Home from "@lucide/svelte/icons/house";
  import Film from "@lucide/svelte/icons/film";
  import Separator from "./components/ui/separator/separator.svelte";

  let { children } = $props();
</script>

<Sidebar.Root>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuButton>
        {#snippet child({ props })}
          <div {...props}>
            <Film />
            <span class="text-lg font-semibold">Gallery</span>
          </div>
        {/snippet}
      </Sidebar.MenuButton>
    </Sidebar.Menu>
  </Sidebar.Header>
  <Separator />
  <Sidebar.Content>
    {@render children?.()}
  </Sidebar.Content>
  <Separator />
  <Sidebar.Footer>
    <Sidebar.Menu>
      <Sidebar.MenuButton>
        {#snippet child({ props })}
          <a href="/settings" {...props}>
            <Settings />
            <p>Settings</p>
          </a>
        {/snippet}
      </Sidebar.MenuButton>
    </Sidebar.Menu>
    <Sidebar.Menu>
      <Sidebar.MenuButton>
        {#snippet child({ props })}
          <a href="/" {...props}>
            <Home />
            <p>Home</p>
          </a>
        {/snippet}
      </Sidebar.MenuButton>
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>

<Sidebar.Inset class="cursor-pointer">
  <Sidebar.Trigger class="size-12 cursor-pointer z-10" />
</Sidebar.Inset>
