// vite.config.js
import { defineConfig } from "file:///Users/Stephen/Documents/GitHub/cannasol-technologies/nano-kava-react-page/node_modules/vite/dist/node/index.js";
import react from "file:///Users/Stephen/Documents/GitHub/cannasol-technologies/nano-kava-react-page/node_modules/@vitejs/plugin-react/dist/index.js";
import vitePrerender from "file:///Users/Stephen/Documents/GitHub/cannasol-technologies/nano-kava-react-page/node_modules/vite-plugin-prerender-k/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/Users/Stephen/Documents/GitHub/cannasol-technologies/nano-kava-react-page";
var Renderer = vitePrerender.PuppeteerRenderer;
var vite_config_default = defineConfig({
  plugins: [
    react(),
    vitePrerender({
      staticDir: path.join(__vite_injected_original_dirname, "dist"),
      routes: ["/", "/faq", "/contact", "/mushrooms"],
      renderer: new Renderer({
        renderAfterDocumentEvent: "app-rendered"
      }),
      postProcess(renderedRoute) {
        if (renderedRoute.html.includes('data-rh="true"')) {
          const tagsToDedup = [
            'name="description"',
            'property="og:title"',
            'property="og:description"',
            'property="og:url"'
          ];
          for (const attr of tagsToDedup) {
            const staticRegex = new RegExp(
              `<meta ${attr}(?![^>]*data-rh)[^>]*>`,
              "i"
            );
            renderedRoute.html = renderedRoute.html.replace(staticRegex, "");
          }
        }
        return renderedRoute;
      }
    })
  ],
  server: {
    port: 3e3,
    open: true
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setupTests.js"]
  },
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvU3RlcGhlbi9Eb2N1bWVudHMvR2l0SHViL2Nhbm5hc29sLXRlY2hub2xvZ2llcy9uYW5vLWthdmEtcmVhY3QtcGFnZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL1N0ZXBoZW4vRG9jdW1lbnRzL0dpdEh1Yi9jYW5uYXNvbC10ZWNobm9sb2dpZXMvbmFuby1rYXZhLXJlYWN0LXBhZ2Uvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL1N0ZXBoZW4vRG9jdW1lbnRzL0dpdEh1Yi9jYW5uYXNvbC10ZWNobm9sb2dpZXMvbmFuby1rYXZhLXJlYWN0LXBhZ2Uvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgdml0ZVByZXJlbmRlciBmcm9tICd2aXRlLXBsdWdpbi1wcmVyZW5kZXItayc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgUmVuZGVyZXIgPSB2aXRlUHJlcmVuZGVyLlB1cHBldGVlclJlbmRlcmVyO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB2aXRlUHJlcmVuZGVyKHtcbiAgICAgIHN0YXRpY0RpcjogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2Rpc3QnKSxcbiAgICAgIHJvdXRlczogWycvJywgJy9mYXEnLCAnL2NvbnRhY3QnLCAnL211c2hyb29tcyddLFxuICAgICAgcmVuZGVyZXI6IG5ldyBSZW5kZXJlcih7XG4gICAgICAgIHJlbmRlckFmdGVyRG9jdW1lbnRFdmVudDogJ2FwcC1yZW5kZXJlZCcsXG4gICAgICB9KSxcbiAgICAgIHBvc3RQcm9jZXNzKHJlbmRlcmVkUm91dGUpIHtcbiAgICAgICAgLy8gcmVhY3QtaGVsbWV0LWFzeW5jIGFkZHMgY29ycmVjdCBwZXItcGFnZSB0YWdzIHdpdGggZGF0YS1yaD1cInRydWVcIlxuICAgICAgICAvLyBidXQgdGhlIG9yaWdpbmFsIHN0YXRpYyB0YWdzIGZyb20gaW5kZXguaHRtbCByZW1haW4gYXMgZHVwbGljYXRlcy5cbiAgICAgICAgLy8gUmVtb3ZlIHN0YXRpYyBkdXBsaWNhdGVzIHdoZW4gSGVsbWV0IHZlcnNpb25zIGV4aXN0LlxuICAgICAgICBpZiAocmVuZGVyZWRSb3V0ZS5odG1sLmluY2x1ZGVzKCdkYXRhLXJoPVwidHJ1ZVwiJykpIHtcbiAgICAgICAgICAvLyBSZW1vdmUgc3RhdGljIG1ldGEgdGFncyB0aGF0IEhlbG1ldCBoYXMgcmVwbGFjZWRcbiAgICAgICAgICBjb25zdCB0YWdzVG9EZWR1cCA9IFtcbiAgICAgICAgICAgICduYW1lPVwiZGVzY3JpcHRpb25cIicsXG4gICAgICAgICAgICAncHJvcGVydHk9XCJvZzp0aXRsZVwiJyxcbiAgICAgICAgICAgICdwcm9wZXJ0eT1cIm9nOmRlc2NyaXB0aW9uXCInLFxuICAgICAgICAgICAgJ3Byb3BlcnR5PVwib2c6dXJsXCInLFxuICAgICAgICAgIF07XG4gICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIHRhZ3NUb0RlZHVwKSB7XG4gICAgICAgICAgICAvLyBNYXRjaCB0aGUgc3RhdGljIHRhZyAod2l0aG91dCBkYXRhLXJoKSBhbmQgcmVtb3ZlIGl0XG4gICAgICAgICAgICAvLyBOZWdhdGl2ZSBsb29rYWhlYWQgaW5zaWRlIHRoZSB0YWcgZW5zdXJlcyB3ZSBvbmx5IHJlbW92ZSBub24tSGVsbWV0IHRhZ3NcbiAgICAgICAgICAgIGNvbnN0IHN0YXRpY1JlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICAgYDxtZXRhICR7YXR0cn0oPyFbXj5dKmRhdGEtcmgpW14+XSo+YCxcbiAgICAgICAgICAgICAgJ2knXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmVuZGVyZWRSb3V0ZS5odG1sID0gcmVuZGVyZWRSb3V0ZS5odG1sLnJlcGxhY2Uoc3RhdGljUmVnZXgsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlbmRlcmVkUm91dGU7XG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIG9wZW46IHRydWVcbiAgfSxcbiAgdGVzdDoge1xuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgc2V0dXBGaWxlczogWycuL3NyYy90ZXN0L3NldHVwVGVzdHMuanMnXVxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHNvdXJjZW1hcDogZmFsc2VcbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdaLFNBQVMsb0JBQW9CO0FBQzdhLE9BQU8sV0FBVztBQUNsQixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTSxXQUFXLGNBQWM7QUFFL0IsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sY0FBYztBQUFBLE1BQ1osV0FBVyxLQUFLLEtBQUssa0NBQVcsTUFBTTtBQUFBLE1BQ3RDLFFBQVEsQ0FBQyxLQUFLLFFBQVEsWUFBWSxZQUFZO0FBQUEsTUFDOUMsVUFBVSxJQUFJLFNBQVM7QUFBQSxRQUNyQiwwQkFBMEI7QUFBQSxNQUM1QixDQUFDO0FBQUEsTUFDRCxZQUFZLGVBQWU7QUFJekIsWUFBSSxjQUFjLEtBQUssU0FBUyxnQkFBZ0IsR0FBRztBQUVqRCxnQkFBTSxjQUFjO0FBQUEsWUFDbEI7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQ0EscUJBQVcsUUFBUSxhQUFhO0FBRzlCLGtCQUFNLGNBQWMsSUFBSTtBQUFBLGNBQ3RCLFNBQVMsSUFBSTtBQUFBLGNBQ2I7QUFBQSxZQUNGO0FBQ0EsMEJBQWMsT0FBTyxjQUFjLEtBQUssUUFBUSxhQUFhLEVBQUU7QUFBQSxVQUNqRTtBQUFBLFFBQ0Y7QUFDQSxlQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixhQUFhO0FBQUEsSUFDYixTQUFTO0FBQUEsSUFDVCxZQUFZLENBQUMsMEJBQTBCO0FBQUEsRUFDekM7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxFQUNiO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
