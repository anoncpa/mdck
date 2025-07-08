# Lint Test Cases

## Case 1: 重複テンプレートID (M002)

:::template{id="duplicate"}
# 最初のテンプレート
- [ ] タスク1
:::

:::template{id="duplicate"}
# 重複したテンプレート
- [ ] タスク2
:::

## Case 2: 未定義テンプレート参照 (M003)

:::template{id="main"}
# メインテンプレート
::template{id="undefined-template"}
- [ ] メインタスク
:::

## Case 3: 循環参照 (M004)

:::template{id="circular-a"}
# 循環A
::template{id="circular-b"}
:::

:::template{id="circular-b"}
# 循環B
::template{id="circular-a"}
:::

## Case 4: 正常なテンプレート

:::template{id="valid-parent"}
# 正常な親テンプレート
::template{id="valid-child"}
- [ ] 親のタスク
:::

:::template{id="valid-child"}
# 正常な子テンプレート
- [ ] 子のタスク
:::
