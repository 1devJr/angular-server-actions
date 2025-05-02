import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import { tokenSessionService } from './app/server/token-session.service';
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const ALLOWED_ORIGIN = 'localhost:4000';
app.use(cookieParser());

app.use((req, res, next) => {
  const origin = req.headers.host;
  if (origin !== ALLOWED_ORIGIN) {
    // Se a origem não for a permitida, retorna 401 Unauthorized
    return res.status(401).json({ error: 'Unauthorized: Invalid Origin' });
  }

  const token = req.cookies['x-session-token'];
  // Se o token for válido, atualiza o token
  const newToken = tokenSessionService.createToken();

  // Atualiza o cookie com o novo token
  res.cookie('x-session-token', newToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 5 * 60 * 1000, // 5 minutos
  });

  // Passa para o próximo middleware ou rota
  return next();
});

// 🔧 Rota customizada: defina antes de qualquer coisa
app.get('/user', (req, res) => {
  console.debug('GET /user request');
  res.status(200).json({
    name: 'John Doe',
    age: 30,
    city: 'New York',
  });
});

app.post('/auth/session', (req, res) => {
  const token = tokenSessionService.createToken();

  res.cookie('x-session-token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 5 * 60 * 1000, // 5 minutos
  });

  res.status(200).json({ success: true });
});

// 🧱 Servir arquivos estáticos
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

// 🎯 SSR para todas as outras rotas
app.use('*', async (req, res, next) => {
  try {
    const response = await angularApp.handle(req);
    if (response) {
      await writeResponseToNodeResponse(response, res);
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// 🚀 Start do servidor local
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`✅ Angular SSR listening at http://localhost:${port}`);
  });
}

// 🧩 Export usado por Firebase Functions e afins
export const reqHandler = createNodeRequestHandler(app);
