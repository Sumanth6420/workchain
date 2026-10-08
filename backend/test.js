const API = 'http://localhost:5001/api';
async function call(path, method = 'GET', body, token) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}
let failed = 0;
const check = (name, ok) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name); if (!ok) failed++; };

(async () => {
  const id = Date.now();
  const reg = (n, r) => call('/auth/register', 'POST', { name: n, email: n + id + '@t.com', password: 'test1234', role: r });
  const c = await reg('client', 'client');
  const f1 = await reg('free1', 'freelancer');
  const f2 = await reg('free2', 'freelancer');
  check('register client + 2 freelancers', c.status === 201 && f1.status === 201 && f2.status === 201);

  const login = await call('/auth/login', 'POST', { email: 'client' + id + '@t.com', password: 'test1234' });
  check('login works', login.status === 200 && !!login.data.token);
  const bad = await call('/auth/login', 'POST', { email: 'client' + id + '@t.com', password: 'wrong' });
  check('wrong password rejected', bad.status === 401);

  const body = { title: 'Test', description: 'd', budget: 1, milestones: [{ title: 'M1', amount: 0.5 }] };
  check('freelancer cannot create project', (await call('/projects', 'POST', body, f1.data.token)).status === 403);
  const p = await call('/projects', 'POST', body, c.data.token);
  check('client creates project', p.status === 201);
  const pid = p.data._id;

  check('freelancer 1 submits proposal', (await call('/projects/' + pid + '/proposals', 'POST', { message: 'hi', bid: 1 }, f1.data.token)).status === 201);
  check('duplicate proposal rejected', (await call('/projects/' + pid + '/proposals', 'POST', { message: 'again', bid: 1 }, f1.data.token)).status === 409);
  check('freelancer 2 submits proposal', (await call('/projects/' + pid + '/proposals', 'POST', { message: 'me too', bid: 2 }, f2.data.token)).status === 201);
  check('freelancer cannot read proposals', (await call('/projects/' + pid + '/proposals', 'GET', null, f2.data.token)).status === 403);

  const list = await call('/projects/' + pid + '/proposals', 'GET', null, c.data.token);
  check('client sees 2 proposals', list.status === 200 && list.data.length === 2);
  const mine = list.data.find((x) => x.freelancer.name === 'free1');

  check('freelancer cannot accept proposal', (await call('/proposals/' + mine._id + '/accept', 'POST', null, f1.data.token)).status === 403);
  const acc = await call('/proposals/' + mine._id + '/accept', 'POST', null, c.data.token);
  check('client accepts proposal -> in-progress', acc.status === 200 && acc.data.status === 'in-progress');
  check('second accept rejected', (await call('/proposals/' + mine._id + '/accept', 'POST', null, c.data.token)).status === 400);

  check('wrong freelancer cannot confirm', (await call('/projects/' + pid + '/confirm', 'POST', null, f2.data.token)).status === 403);
  const conf = await call('/projects/' + pid + '/confirm', 'POST', null, f1.data.token);
  check('assigned freelancer confirms', conf.status === 200 && conf.data.freelancerAccepted === true);

  check('invalid wallet rejected', (await call('/me/wallet', 'PATCH', { wallet: '123' }, f1.data.token)).status === 400);
  check('valid wallet saved', (await call('/me/wallet', 'PATCH', { wallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' }, f1.data.token)).status === 200);

  console.log(failed === 0 ? '\nALL TESTS PASSED' : '\n' + failed + ' TEST(S) FAILED');
  process.exit(failed ? 1 : 0);
})();
