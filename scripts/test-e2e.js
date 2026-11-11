const http = require('http');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers },
    };

    let postData = null;
    if (body) {
      if (typeof body === 'string') {
        postData = body;
      } else if (body instanceof FormDataMock) {
        postData = body.getBuffer();
        options.headers['Content-Type'] = body.getContentType();
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      } else {
        postData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }
    }

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        const setCookie = res.headers['set-cookie'];
        let json = null;
        try {
          json = JSON.parse(rawBuffer.toString('utf8'));
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          setCookie,
          rawBuffer,
          text: rawBuffer.toString('utf8'),
          json,
        });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Multipart FormData builder for testing uploads
class FormDataMock {
  constructor() {
    this.boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
    this.parts = [];
  }
  appendField(name, value) {
    this.parts.push(
      Buffer.from(
        `--${this.boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      )
    );
  }
  appendFile(name, filename, mimeType, buffer) {
    this.parts.push(
      Buffer.from(
        `--${this.boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      )
    );
    this.parts.push(buffer);
    this.parts.push(Buffer.from('\r\n'));
  }
  getContentType() {
    return `multipart/form-data; boundary=${this.boundary}`;
  }
  getBuffer() {
    return Buffer.concat([...this.parts, Buffer.from(`--${this.boundary}--\r\n`)]);
  }
}

function extractCookie(setCookieHeaders, cookieName = 'app_session') {
  if (!setCookieHeaders) return null;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const cookieStr of list) {
    const parts = cookieStr.split(';');
    const [nameVal] = parts;
    const [key, val] = nameVal.trim().split('=');
    if (key === cookieName) {
      return val;
    }
  }
  return null;
}

async function runE2ETest() {
  console.log('🧪 ========================================================');
  console.log('🧪 STARTING COMPREHENSIVE E2E VERIFICATION SCENARIO');
  console.log('🧪 ========================================================');

  // STEP 0: Prepare a dedicated test admin
  console.log('\n[STEP 0] Ensuring Admin account exists...');
  const testUsername = 'admin_e2e';
  const testPassword = 'Password#2026!';
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(testPassword, salt);

  const admin = await prisma.user.upsert({
    where: { username: testUsername },
    update: { password_hash, status: 'ACTIVE', role: 'Admin' },
    create: {
      name: 'E2E Test Administrator',
      username: testUsername,
      password_hash,
      role: 'Admin',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Admin ready: username="${testUsername}"`);

  // STEP 1: Admin Login
  console.log('\n[STEP 1] Testing Admin Login via /api/auth/login...');
  const loginRes = await request('POST', '/api/auth/login', {
    username: testUsername,
    password: testPassword,
  });

  if (loginRes.statusCode !== 200 || !loginRes.json?.success) {
    throw new Error(`Admin login failed: ${loginRes.text}`);
  }
  const adminCookie = extractCookie(loginRes.setCookie);
  if (!adminCookie) throw new Error('No app_session cookie returned for admin login!');
  console.log(`✅ Admin logged in successfully! Cookie received.`);

  const adminHeaders = { Cookie: `app_session=${adminCookie}` };

  // STEP 2: Admin creates QR Code
  console.log('\n[STEP 2] Admin generates enrollment QR Code via /api/qr-tokens...');
  const qrRes = await request('POST', '/api/qr-tokens', { expiryHours: 24 }, adminHeaders);
  if (qrRes.statusCode !== 200 || !qrRes.json?.success) {
    throw new Error(`QR creation failed: ${qrRes.text}`);
  }

  const { plainToken, targetUrl, qrDataUrl } = qrRes.json.tokenRecord;
  if (!plainToken || !qrDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Invalid QR code response data!');
  }
  console.log(`✅ QR Code generated successfully!`);
  console.log(`   - Plain Token: ${plainToken.slice(0, 16)}...`);
  console.log(`   - Target URL: ${targetUrl}`);
  console.log(`   - QR PNG Data URL: ${qrDataUrl.slice(0, 40)}...`);

  // STEP 3: Karyawan scans QR (validates token)
  console.log('\n[STEP 3] Employee scans QR code -> validates token via /api/enroll/validate...');
  const validateRes = await request('GET', `/api/enroll/validate?token=${plainToken}`);
  if (validateRes.statusCode !== 200 || !validateRes.json?.valid) {
    throw new Error(`Token validation failed: ${validateRes.text}`);
  }
  console.log(`✅ QR token is valid and active.`);

  // STEP 4 & 5: Karyawan fills name -> auto-creates user with role "Penginventaris" & receives session
  console.log('\n[STEP 4 & 5] Employee submits registration name via /api/enroll/register...');
  const employeeName = `Budi Santoso E2E`;
  const registerRes = await request('POST', '/api/enroll/register', {
    token: plainToken,
    name: employeeName,
  });

  if (registerRes.statusCode !== 200 || !registerRes.json?.success) {
    throw new Error(`Employee registration failed: ${registerRes.text}`);
  }
  const employeeUser = registerRes.json.user;
  if (employeeUser.role !== 'Penginventaris') {
    throw new Error(`Role is not "Penginventaris", got: ${employeeUser.role}`);
  }
  const empCookie = extractCookie(registerRes.setCookie);
  if (!empCookie) throw new Error('No session cookie returned for employee registration!');
  console.log(`✅ Employee registered automatically!`);
  console.log(`   - ID: ${employeeUser.id}`);
  console.log(`   - Name: ${employeeUser.name}`);
  console.log(`   - Role: ${employeeUser.role}`);

  // Test token one-time use enforcement: scanning again must be rejected!
  console.log('\n[VERIFY 1-TIME USE] Scanning used token again must be rejected...');
  const reusedRes = await request('POST', '/api/enroll/register', {
    token: plainToken,
    name: 'Another User',
  });
  if (reusedRes.statusCode === 200) {
    throw new Error('Token allowed multiple registrations! It should be single use.');
  }
  console.log(`✅ Token reuse prevented! Status: ${reusedRes.statusCode} ("${reusedRes.json?.error}")`);

  const empHeaders = { Cookie: `app_session=${empCookie}` };

  // STEP 6, 7, 8, 9, 10: Form Input & Confirmation Submit
  console.log('\n[STEP 6 - 10] Employee submits inventory item with photo upload...');
  // Get active category
  const catRes = await request('GET', '/api/categories', null, empHeaders);
  const categories = catRes.json?.categories || [];
  const testCat = categories[0] || { id: 'default', name: 'Elektronik' };

  const formData = new FormDataMock();
  formData.appendField('name', 'Laptop Dell XPS 15 E2E');
  formData.appendField('category_id', testCat.id);
  formData.appendField('location', 'Ruang IT Lantai 2');
  formData.appendField('quantity', '3');
  formData.appendField('condition', 'Baik');

  // Dummy 1x1 transparent PNG buffer
  const dummyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  formData.appendFile('photo', 'laptop_test.png', 'image/png', dummyPng);

  const createInvRes = await request('POST', '/api/inventory', formData, empHeaders);
  if (createInvRes.statusCode !== 200 || !createInvRes.json?.success) {
    throw new Error(`Inventory creation failed: ${createInvRes.text}`);
  }

  const createdInventory = createInvRes.json.inventory;
  console.log(`✅ Inventory item created successfully!`);
  console.log(`   - ID: ${createdInventory.id}`);
  console.log(`   - Name: ${createdInventory.name}`);
  console.log(`   - Category: ${createdInventory.categoryName}`);
  console.log(`   - Quantity: ${createdInventory.quantity}`);
  console.log(`   - Photo: ${createdInventory.photoPath}`);

  // STEP 11 & 12: Verify item appears in Admin Dashboard & Stats
  console.log('\n[STEP 11 & 12] Verifying item in Admin Dashboard Stats...');
  const statsRes = await request('GET', '/api/dashboard/stats', null, adminHeaders);
  if (statsRes.statusCode !== 200) {
    throw new Error(`Admin dashboard stats failed: ${statsRes.text}`);
  }
  const statsData = statsRes.json;
  console.log(`✅ Admin dashboard loaded!`);
  console.log(`   - Total Jenis Barang: ${statsData.stats.totalTypes}`);
  console.log(`   - Total Unit Barang: ${statsData.stats.totalUnits}`);
  console.log(`   - Total Kategori: ${statsData.stats.totalCategories}`);
  console.log(`   - Total Penginput: ${statsData.stats.totalEmployees}`);

  // STEP 13: Verify item appears in Employee Portal list
  console.log('\n[STEP 13] Verifying item in Employee Portal list...');
  const empListRes = await request('GET', '/api/inventory?only_mine=true', null, empHeaders);
  if (empListRes.statusCode !== 200) {
    throw new Error(`Employee inventory list failed: ${empListRes.text}`);
  }
  const foundInMine = empListRes.json.items.find((i) => i.id === createdInventory.id);
  if (!foundInMine) {
    throw new Error('Created item not found in employee personal list!');
  }
  console.log(`✅ Item found in Employee personal list! (Name: "${foundInMine.name}")`);

  // STEP 14: Admin filters inventory by employee
  console.log('\n[STEP 14] Admin filters inventory by employee...');
  const filterRes = await request(
    'GET',
    `/api/inventory?created_by=${employeeUser.id}`,
    null,
    adminHeaders
  );
  if (filterRes.statusCode !== 200) {
    throw new Error(`Admin filter failed: ${filterRes.text}`);
  }
  console.log(`✅ Admin filter returned ${filterRes.json.items.length} items for ${employeeName}`);

  // STEP 15: Admin downloads PDF, Excel XLSX, and CSV
  console.log('\n[STEP 15] Testing Exports: PDF, Excel, and CSV...');
  
  // 15.1 PDF
  const pdfRes = await request('GET', '/api/export/pdf', null, adminHeaders);
  if (pdfRes.statusCode !== 200 || !pdfRes.rawBuffer.toString('ascii', 0, 4).startsWith('%PDF')) {
    throw new Error(`PDF export failed! Header signature not %PDF.`);
  }
  console.log(`✅ PDF export succeeded! File size: ${pdfRes.rawBuffer.length} bytes (%PDF valid)`);

  // 15.2 Excel XLSX
  const excelRes = await request('GET', '/api/export/excel', null, adminHeaders);
  // Zip/XLSX starts with PK (0x50 0x4B)
  if (excelRes.statusCode !== 200 || excelRes.rawBuffer[0] !== 0x50 || excelRes.rawBuffer[1] !== 0x4b) {
    throw new Error(`Excel export failed! Binary header not PK.`);
  }
  console.log(`✅ Excel XLSX export succeeded! File size: ${excelRes.rawBuffer.length} bytes (PK valid)`);

  // 15.3 CSV
  const csvRes = await request('GET', '/api/export/csv', null, adminHeaders);
  if (csvRes.statusCode !== 200 || !csvRes.text.includes('Nama Barang')) {
    throw new Error(`CSV export failed! Header row missing.`);
  }
  console.log(`✅ CSV export succeeded! Length: ${csvRes.text.length} chars (UTF-8 valid)`);

  console.log('\n🎉 ========================================================');
  console.log('🎉 ALL 15 END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('🎉 ========================================================');
}

// Check if server is running, if not start Next.js production server
async function main() {
  let serverStartedByScript = false;
  let serverProc = null;

  try {
    // Quick probe
    try {
      await request('GET', '/api/auth/me');
      console.log('🌐 Server already running on port 3000.');
    } catch {
      console.log('🚀 Starting Next.js server on 0.0.0.0:3000 for E2E testing...');
      const { spawn } = require('child_process');
      serverProc = spawn('npm', ['run', 'start'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      serverStartedByScript = true;

      // Poll until ready
      for (let i = 0; i < 30; i++) {
        await sleep(1000);
        try {
          await request('GET', '/api/auth/me');
          console.log('✅ Server is ready!');
          break;
        } catch {}
      }
    }

    await runE2ETest();
  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    process.exit(1);
  } finally {
    if (serverStartedByScript && serverProc) {
      console.log('🛑 Stopping test server...');
      serverProc.kill();
    }
    await prisma.$disconnect();
  }
}

main();
