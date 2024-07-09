import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors';
import mint from './mint'

export const config = {
  runtime: 'edge'
}

const app = new Hono().basePath('/api')

app.use('/*', cors());
app.route('/mint', mint);

export default handle(app)
