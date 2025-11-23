import type { iDIContainer } from "./container";

/**
 * Represents a function that registers multiple providers in a container.
 * Created using {@link createProviderSet}.
 */

export type iNodeProviderSet = (container: iDIContainer) => void;
