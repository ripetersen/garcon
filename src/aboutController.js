import services from './services.js';
/**
 * @module aboutController
 **/

/**
 * About endpoint returns the configured about information
 **/
export default class AboutController {
  async route(router) {
    var about = await services.get('about')
    router.route('').any((ctx) => {
      ctx.set('Content-Type', 'application/json')
      ctx.body = JSON.stringify(about, null, 2)
      ctx.response.status=200
    })
  }
}
