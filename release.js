const inquirer = require("inquirer");
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");

function extractLatestChangelogBlock(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const match = content.match(/^[-]{5,}\r?\n([\s\S]*?)(?=\r?\n[-]{5,})/m);
    if (!match) {
        throw new Error("❌ 无法在 changelog.txt 中提取版本记录");
    }
    return match[1].trim();
}

(async () => {
    const prompt = inquirer.createPromptModule();
    const { type } = await prompt([
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
        // 提取 changelog.txt 中最新块
        const block = extractLatestChangelogBlock("changelog.txt");

        // 提取版本和日期
        const [versionLine, dateLine] = block.split("\n");
        const versionMatch = versionLine.match(/Version:\s*(.+)/);
        const dateMatch = dateLine.match(/Date:\s*(.+)/);
        if (!versionMatch || !dateMatch) throw new Error("无法解析版本或日期");

        const v = versionMatch[1].trim();
        const date = dateMatch[1].trim();

        const formattedChangelog = `Date: ${date}\nChanges:\n- ${block
            .split("\n")
            .slice(2)
            .join("\n- ")}`;

        // Git 操作
        execSync(`git add .`, { stdio: "inherit" });

        execSync(`npx standard-version --release-as ${type} --skip.changelog`, {
            stdio: "inherit",
        });

        execSync(`git push origin main --follow-tags`, { stdio: "inherit" });

        // 创建 GitHub Release
        const result = spawnSync(
            "gh",
            [
                "release",
                "create",
                `${v}`,
                "--title",
                `Version：${v}`,
                "--notes",
                `${formattedChangelog}`,
            ],
            {
                stdio: ["pipe", "inherit", "inherit"],
                encoding: "utf-8",
            }
        );

        if (result.status !== 0) {
            throw new Error("gh release create 命令执行失败");
        }
    } catch (e) {
        console.error("❌ 发布过程中出错：", e.message);
    }
})();
