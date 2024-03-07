export default class ShutdownController {
  constructor(server, listener) {
    this.server = server
    this.listener = listener
  }

  route(router) {
    const self = this
    router.route('')
      .get(() => {
        self.code = Math.floor(Number.MAX_SAFE_INTEGER * Math.random())
        self.timeout = Date.now() + 30000
        console.log(self.code)
      })

    router.route('/:code')
      .get(async (ctx) => {
        if( Date.now() < self.timeout && ctx.request.params.code == self.code ) {
          console.log("Shutting down...");
          if( self.listener ) {
            await self.listener();
          }
          self.server.close();
        }
      })
  }
}
