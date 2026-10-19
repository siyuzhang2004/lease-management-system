# 租赁管理系统

面向承租人财务核算的本地网页项目，以“合同 → 计算参数 → 计算表”组织业务流程。

## 当前功能

- 按合同保存财务参数、计算结果及参数版本。
- 分阶段设置租金、阶段月数、付款频率和期初／期末付款。
- 修改参数后自动计算使用权资产和租赁负债余额。
- 按期间查看逐期明细和年度汇总，并从计算表回看合同参数。
- 高级参数录入、必要的计量校验及合同删除与恢复。

部分复杂条款尚需补充现金流配置，系统会提示复核，不会忽略相关条款继续生成新表。目前不提供文件导入导出、实际付款管理或会计凭证功能。

## 本地运行

需要 Python 3.10 或更高版本。前端使用原生 HTML、CSS 和 JavaScript，不需要构建工具。

在项目目录中运行：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe prototype/server.py
```

浏览器打开 <http://127.0.0.1:8765/>。服务仅监听本机地址。

合同记录保存在当前浏览器的 localStorage 中，不随 Git 推送，也不会在不同浏览器或设备之间同步。首次运行时通过“新增合同”填写参数。

## 项目结构

- `prototype/server.py`：本地服务及计算接口。
- `prototype/lease_engine.py`：付款安排、现值、利息及折旧计算。
- `prototype/contract-workspace.js`：合同台账及参数、计算表页面关联。
- `prototype/rent-phases.js`：租金阶段和付款规则。
- `prototype/contract-advanced.js`：高级财务参数。
- `prototype/index.html`、`prototype/style.css`、`prototype/calculation.css`：页面及样式。

`lease_linking.py` 中保留历史辅助代码，当前服务不开放相关接口。

## 检查

安装 Node.js 后，可运行前端业务检查：

```powershell
node prototype/check-contract-links.cjs
node prototype/check-financial-rules.cjs
```

完整计算回归检查：

```powershell
python -m unittest discover -s prototype -p test_lease_engine.py
```

其中部分历史回归用例需要在项目根目录提供本地样本 `西安公司使用权资产.xlsx`。合同原件、样本、截图、分析输出及日志均不提交到仓库；日常运行服务不需要这些文件。

当前版本用于本地验证。多人使用、服务器部署、权限与数据持久化需进一步实现。
