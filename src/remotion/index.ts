/**
 * Remotion bundle entrypoint (used by the Phase 2 server renderer /
 * `npx remotion` CLI). Next.js never imports this — the live preview mounts
 * <NewsComposition> through the Player instead.
 */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
