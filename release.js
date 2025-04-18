const inquirer = require("inquirer");
const { execSync } = require("child_process");

(async () => {
    const prompt = inquirer.createPromptModule(); // 初始化 prompt
    const { type } = await prompt([  // 使用 prompt 变量
        {
            type: "list",
            name: "type",
            message: "请选择发布类型：",
            choices: [
                { name: "🔧 Patch - 修复或小调整", value: "patch" },
                { name: "✨ Minor - 添加功能（向下兼容）", value: "minor" },
                {
                    name: "💥 Major - 破坏性变更（不兼容旧存档）",
                    value: "major",
                },
            ],
        },
    ]);

    try {
        execSync(`git add . && git commit -m "chore: release prep"`, {
            stdio: "inherit",
        });

        execSync(`npx standard-version --release-as ${type}`, {
            stdio: "inherit",
        });

        execSync(`git push origin main --follow-tags`, {
            stdio: "inherit",
        });

        execSync(`npx github-release-from-changelog`, {
            stdio: "inherit",
        });
    } catch (e) {
        console.error("❌ 发布过程中出错：", e.message);
    }
})();
