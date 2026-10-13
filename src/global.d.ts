declare global {
  interface Window {
    /** Seed snapshot shipped with the static build, injected at runtime. */
    __SAMHO_SEED__?: any;
  }
}

export {};