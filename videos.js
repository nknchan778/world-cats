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
https://x.com/nyanz365/status/2110566337806303251?s=46   子猫　短足　白猫　猫パンチ　喧嘩
https://x.com/01iwnrqrril7nzr/status/2110691155633635447?s=46   エキゾチックショートヘア　ふみふみ
https://x.com/natuuri98/status/2111123001668432364?s=46   子猫　キジトラ　白黒猫　ぶち猫　ごはん
https://x.com/gekikawa_dbts/status/2110928726389375414?s=46   ぶち猫　子猫　猫パンチ
https://x.com/omo__omochi/status/2110664803346010308?s=46   はちわれ　おしゃべり　白黒猫
https://x.com/nekodeaaa/status/2111300485789741305?s=46   茶トラ　子猫　よちよち
https://x.com/h_ema314/status/2111259293706305778?s=46   シャム猫　子猫　クリーム色　ミルク
https://x.com/neco_nya_06/status/2111080915929833598?s=46   キジトラ　甘えん坊
https://x.com/necole_cc22/status/2111055639674015882?s=46   茶トラ　甘えん坊　ふみふみ
https://x.com/komochibo/status/2113769729982910734/video/1?s=46   香箱座り　白黒猫　ぶち猫
https://x.com/kitten_zukan/status/2114316541412118658?s=46   子猫　グレー　ブラウン　ミルク
https://x.com/skr_melonpan_13/status/2114729079253663967?s=46   はちわれ　サバトラ　子猫

`;
