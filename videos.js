/* ==========================================================
   🐾 動画リスト 🐾
   動画を足すときに編集するのは、このファイルだけです!
   ==========================================================

   【書き方】 1行に1本。 URL のあとに空白をあけて、タグを書きます。

        URL  タグ  タグ  タグ ...

   ・URLは、SNSアプリの「リンクをコピー」で出たものを、そのまま貼ってOK。
     (?si=... などの余計な部分は、自動で取り除かれます)
   ・SNS(Instagram / X / YouTube / TikTok / Threads)は、URLから自動で判別します。
   ・タグは空白で区切って、いくつでも書けます。(例: 三毛猫 子猫 おもしろ)
     先頭に # を付けても付けなくてもOKです。
   ・// で始まる行は「メモ」です。サイトには表示されません。
   ・新しく足した動画ほど、サイトの上のほうに表示されます。
     なので、いちばん下(下の「`;」の1行上)に足していけばOKです。

   【見本】
        https://www.youtube.com/shorts/xxxxxxxxxxx   三毛猫 子猫 おもしろ
        https://x.com/someone/status/1234567890      黒猫 おもしろ

   【投稿者名を自分で書きたいとき(省略OK)】
        行のどこかに @名前 を足します。
        https://www.instagram.com/reel/xxxxxxx/   @catlover   三毛猫
        ※ Instagram は投稿者名を自動で取れないので、書いておくと表示されます。
        ※ X・TikTok・Threads は URL から、YouTube は公式の仕組みで自動表示されます。

   【書き間違えても大丈夫】
   ・まちがった行は、その行だけ飛ばされます。ほかの動画は、ふつうに表示されます。
   ・どの行がダメだったか知りたいときは、サイトのアドレスの最後に ?check=1 を付けて
     開くと、理由が出ます。(例: index.html?check=1)

   【これだけは消さないで!】
   ・下の「const VIDEO_LIST = `」の行と、いちばん下の「`;」の行。
     (` は「バッククォート」という記号です。この2つの ` が消えると、動画が出なくなります)
   ========================================================== */

const VIDEO_LIST = `

// ===== ここから下に、動画を1行ずつ足していきます =====

// ▼ 動作確認用のサンプルです(タグは仮のものです)。不要になったら、この3行を消してください。
https://youtu.be/3hQpnyGSMCU?si=GGEvMvfHnYjg4Fg8   おしゃべり おもしろ 
https://x.com/higanemochan/status/2109931547860316575?s=46   野良猫 おもしろ
https://www.instagram.com/reel/Dd2ixkLoHvy/?dlrf=NDlkcTV0ODVpZjI4   @amelunavienna   日常
https://www.instagram.com/reel/Dd9LHyHMS5W/?rpxt=MWZvejRkMWVvdWlheA== @whiskerwellnessranch 黒猫　
https://www.instagram.com/reel/DdqSC3OoLBO/?rpxt=cjhxMXV2cDB6bmVk  @fjarilflickans 子猫　ラグドール

`;
