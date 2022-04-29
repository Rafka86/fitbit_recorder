import { serve } from 'https://deno.land/std@0.137.0/http/mod.ts';
import { format } from 'https://deno.land/std@0.137.0/datetime/mod.ts';

const files: { [key: string]: string } = {};

const handleConnected = async () => {
  console.log('Connected to client.');
  try {
    await Deno.mkdir('data');
  } catch {
    console.log('Data directory is already existed.');
  }
};

const handleClosed = () => {
  console.log('Disconnected from client.');
  const isContinue = ['yes', 'y'].includes((prompt('Continue? (y/n: default y) >') ?? 'y'));
  if (isContinue) {
    Object.keys(files).forEach(key => delete files[key]);
  } else {
    Deno.exit(0);
  }
};

const handleError = (e: Event | ErrorEvent) => {
  console.log(e instanceof ErrorEvent ? e.message : e.type);
};

const handleMessage = async (message: MessageEvent) => {
  console.log(`Received: ${message.data}`);
  const data = JSON.parse(message.data);
  try {
    await Promise.all(Object.keys(data).map(key => {
      if (!files[key]) {
        files[key] = `${key}-${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      }
      return Deno.writeTextFile(`data/${files[key]}`, `${data[key]}\n`, { append: true });
    }));
  } catch (e) {
    console.log(e);
  }
  return message.data;
};

const requestHandler = (req: Request) => {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response(null, { status: 501 });
  }

  const { socket: ws, response } = Deno.upgradeWebSocket(req);
  ws.onopen = handleConnected;
  ws.onmessage = handleMessage;
  ws.onclose = handleClosed;
  ws.onerror = handleError;
  return response;
};

console.log('Waiting for client.');
serve(requestHandler);
