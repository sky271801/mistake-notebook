import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve('android/app/src/main/res/values/strings.xml');
const content = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">错题本</string>
    <string name="title_activity_main">错题本</string>
    <string name="package_name">com.local.cuotiben</string>
    <string name="custom_url_scheme">com.local.cuotiben</string>
</resources>
`;

writeFileSync(target, content, 'utf8');
