const fs = require('fs');
const path = require('path');
const axios = require('axios');

const repos = {
  XRobot: 'xrobot-org/XRobot',
  LibXR: 'Jiu-xiao/libxr',
  CodeGen: 'Jiu-xiao/LibXR_CppCodeGenerator',
  'bsp-dev-c': 'QDU-Robomaster/bsp-dev-c',
  'bsp-dev-mc02': 'QDU-Robomaster/bsp-dev-mc02',
  'AUTO-Aming-system': 'QDU-Robomaster/AUTO-Aming-system'
};

(async () => {
  const result = {};
  for (const [name, repo] of Object.entries(repos)) {
    try {
      const res = await axios.get(`https://api.github.com/repos/${repo}/commits/master`);
      result[name] = res.data.sha.substring(0, 7);
    } catch {
      result[name] = 'Error';
    }
  }

  const outputDir = path.resolve(__dirname, '../src/data');
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, 'commitInfo.json'),
    JSON.stringify(result, null, 2),
    'utf-8'
  );
})();
