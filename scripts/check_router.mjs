import { r as routerEntry } from '../dist/server/_ssr/router-C_adZpoS.mjs';

const router = routerEntry.getRouter();
console.log('Got router:', !!router);
const matchRoot = router.getMatchedRoutes('/');
console.log('Root match:', matchRoot.foundRoute?.id, JSON.stringify(matchRoot.routeParams), matchRoot.matchedRoutes.length);
const matchGestures = router.getMatchedRoutes('/_dash/gestures');
console.log('Gestures match:', matchGestures.foundRoute?.id, JSON.stringify(matchGestures.routeParams), matchGestures.matchedRoutes.length);

// Try direct render of a route component for root
(async () => {
  try {
    const r = router;
    const route = matchRoot.foundRoute;
    console.log('Found route object id:', route?.id);
  } catch (err) {
    console.error('Error rendering test:', err);
  }
})();
