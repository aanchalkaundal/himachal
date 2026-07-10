import type { SceneRegistry } from "./types";
import { IntroScene } from "./IntroScene";
import { HeadlineScene } from "./HeadlineScene";
import { BodyScene } from "./BodyScene";
import { OutroScene } from "./OutroScene";
import { StorySceneRenderer } from "./StorySceneRenderer";

/** Maps a timeline scene kind to its renderer. Add a kind here + in the
 * timeline builder to support new scene types — the composition is untouched. */
export const SCENE_REGISTRY: SceneRegistry = {
  intro: IntroScene,
  headline: HeadlineScene,
  body: BodyScene,
  outro: OutroScene,
  story: StorySceneRenderer,
};
