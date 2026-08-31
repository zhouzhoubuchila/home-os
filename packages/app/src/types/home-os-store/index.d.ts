declare module '@docker/njs/home-os-store.js' {
  interface HomeOsStoreModule {
    handle: (request: unknown) => void;
    handleIngress: (request: unknown) => void;
    resetHomeOsStoreForTests: () => void;
    route: (request: unknown) => void;
    setHomeOsStoreFsForTests: (fs: unknown) => void;
    setHomeOsStorePrincipalResolverForTests: (resolver: (request: unknown) => unknown) => void;
  }
  const homeOsStore: HomeOsStoreModule;
  export default homeOsStore;
}
