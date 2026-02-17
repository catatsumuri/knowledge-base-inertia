# タブ

> タブを使って、さまざまなオプションやバージョンを表示するためにコンテンツを整理します。

タブを使用すると、ユーザーが切り替え可能な複数のパネルにコンテンツを整理できます。タブはいくつでも追加でき、各タブの中に他のコンポーネントを含めることができます。

<Tabs>
  <Tab title="最初のタブ">
    ☝️ ここは最初のタブの中でのみ表示されるコンテンツです。

    タブの中には任意の数のコンポーネントを追加できます。たとえば、コードブロックです。

    ```java HelloWorld.java theme={null}
      class HelloWorld {
          public static void main(String[] args) {
              System.out.println("Hello, World!");
          }
      }
    ```
  </Tab>

  <Tab title="2番目のタブ" icon="leaf">
    ✌️ こちらは2番目のタブの中だけにあるコンテンツです。

    このタブには <Icon icon="leaf" /> アイコンがあります！
  </Tab>

  <Tab title="3番目のタブ">
    💪 こちらは3番目のタブの中だけにあるコンテンツです。
  </Tab>
</Tabs>

````mdx タブの例 theme={null}
<Tabs>
  <Tab title="最初のタブ">
    ☝️ ここは最初のタブの中でのみ表示されるコンテンツです。

    タブの中には任意の数のコンポーネントを追加できます。たとえば、コードブロックです。
    ```java HelloWorld.java
      class HelloWorld {
          public static void main(String[] args) {
              System.out.println("Hello, World!");
          }
      }
    ```
  </Tab>
  <Tab title="2番目のタブ" icon="leaf">
    ✌️ こちらは2番目のタブの中だけにあるコンテンツです。

    このタブには <Icon icon="leaf" /> アイコンがあります！
  </Tab>
  <Tab title="3番目のタブ">
    💪 こちらは3番目のタブの中だけにあるコンテンツです。
  </Tab>
</Tabs>
````

同じタイトルを持つタブは、ページ全体で同期されます。たとえば、複数のタブグループに `JavaScript` というタブタイトルが含まれている場合、あるタブグループで `JavaScript` を選択すると、他のタブグループでも自動的に `JavaScript` が選択されます。これにより、言語やフレームワークを一度選ぶだけで、その選択がページ全体に反映されます。タブは、同じタイトルを持つ [コードグループ](/components/code-groups) とも同期します。

タブの同期を無効にするには、`<Tabs>` コンポーネントに `sync={false}` を追加します。

```mdx タブ同期を無効化する例 theme={null}
<Tabs sync={false}>
  <Tab title="最初のタブ">
    このタブグループは独立して動作します。
  </Tab>
  <Tab title="2番目のタブ">
    ここでタブを選択しても、他のタブグループには影響しません。
  </Tab>
</Tabs>
```

## プロパティ

<ResponseField name="title" type="string" required>
  タブのタイトル。短いタイトルのほうが操作しやすくなります。同じタイトルを持つタブは選択状態が同期されます。
</ResponseField>

<ResponseField name="icon" type="string">
  [Font Awesome](https://fontawesome.com/icons) アイコン、[Lucide](https://lucide.dev/icons) アイコン、アイコンへの URL、またはアイコンへの相対パス。
</ResponseField>

<ResponseField name="iconType" type="string">
  Font Awesome アイコン専用：`regular`、`solid`、`light`、`thin`、`sharp-solid`、`duotone`、`brands` のいずれか。
</ResponseField>

<ResponseField name="sync" type="boolean" default="true">
  `true` の場合、同じタイトルを持つページ内の他のタブやコードグループと同期します。`false` に設定すると、タブは独立して動作します。
</ResponseField>

<ResponseField name="borderBottom" type="boolean">
  タブコンテナに下線と余白を追加します。特にタブ内のコンテンツの長さが異なる場合に、ページ内の他のコンテンツと視覚的に区切るのに便利です。
</ResponseField>
