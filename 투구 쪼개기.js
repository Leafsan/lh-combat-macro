// 매크로를 실행할 때 전달된 인수에서 필요한 데이터를 가져오기
let { actor: currentActor, item: currentItem } = args[0] ?? {};

// 유효성 검사
if (!currentActor || !currentItem) {
  ui.notifications.error("아이템 또는 배우를 찾을 수 없습니다.");
  return;
}

// 특기 사용에 필요한 MP 소모 및 헤이트 증가
const mpCost = 4;
const hateIncrease = 2;

// 스킬 랭크 (SR) 가져오기
let skillRank = getProperty(currentItem.system, "skillRank.value") || 1;

// 현재 캐릭터의 힘(str) 값 가져오기
let strength =
  getProperty(currentActor.system, "attributes.derived.str.value") || 0;

// 현재 캐릭터의 물리 명중치 (accuracy) 정보 가져오기
let accuracyTotal =
  getProperty(currentActor.system, "checks.accuracy.total") || 0;
let accuracyRank =
  getProperty(currentActor.system, "checks.accuracy.rank") || 0;
let accuracyAttain =
  getProperty(currentActor.system, "checks.accuracy.attain") || 0;

// 타겟 선택 루프
let targetActor;
while (!targetActor) {
  targetActor = await selectTarget();
}
console.log(targetActor);

// MP 소모
const mpConsumed = await game.lhCombatFn.consumeMana(currentActor, mpCost);
if (!mpConsumed.success) {
  ui.notifications.error(mpConsumed.message);
  return;
}

// 헤이트 증가
await game.lhCombatFn.increaseHate(currentActor, hateIncrease);

// 대상의 회피(evasion) 값을 난이도로 설정
let difficulty = getProperty(targetActor.system, "checks.evasion") || 10;

// 다이얼로그를 통해 주사위 개수를 물어봅니다
const renderedDialog = await renderTemplate(
  "systems/lhtrpgbrew/templates/dialogs/rollDialog.html"
);

const dialogTitle = "판정 주사위 선택";

new Dialog({
  title: dialogTitle,
  content: renderedDialog,
  buttons: {
    roll: {
      icon: '<i class="fas fa-dice"></i>',
      label: "주사위 굴리기",
      callback: async (html) => {
        const dices = parseInt(html.find(".abilityCheckDiceNumber").val()) || 2; // 기본 2d6

        // 주사위 굴리기
        let rollFormula = `${dices}d6`;
        let roll = await new Roll(rollFormula).evaluate();
        let rollTotal = roll.total;
        let individualResults = roll.dice[0].results.map((r) => r.result);

        // 판정값 계산
        let difficultyTotal = accuracyTotal - difficulty + accuracyRank;
        let attainTotal = rollTotal + accuracyRank + accuracyAttain;

        let success = rollTotal <= difficultyTotal;
        let additionalFlavor;

        if (success) {
          additionalFlavor = `<h3 style="text-align:center; color:green;">성공</h3><div style="text-align:center; font-size: 20px;">달성치 : ${attainTotal}</div>`;
        } else {
          additionalFlavor = `<h3 style="text-align:center; color:red;">실패</h3>`;
        }

        // 판정 결과를 채팅에 출력
        let content = `
                <h2>판정 결과</h2>
                <h3 style="text-align:center; background-color: #ababab;">주사위 결과</h3>
                <div style="text-align:center; font-size: 20px;">${individualResults.join(
                  ", "
                )}</div>
                <h3 style="text-align:center; background-color: #ababab;">판정값 vs 난이도</h3>
                <div style="text-align:center; font-size: 20px;">${rollTotal} vs ${difficultyTotal}</div>${additionalFlavor}
                `;

        ChatMessage.create({
          content: content,
          speaker: ChatMessage.getSpeaker({ actor: currentActor }),
        });

        // 판정이 성공한 경우 피해 효과 적용
        if (success) {
          // 기본 대미지 계산 (SR+2)d6 + 힘
          let damageFormula = `${skillRank + 2}d6 + ${strength}`;
          let damageRoll = new Roll(damageFormula).evaluate({ async: false });
          let damage = damageRoll.total;

          // 대상의 HP가 최대 HP와 같으면 추가 대미지 적용
          let targetHP = getProperty(targetActor.system, "health.value") || 0;
          let targetMaxHP = getProperty(targetActor.system, "health.max") || 0;
          if (targetHP === targetMaxHP) {
            damage += strength;
          }

          // 새로 등록된 `doDamage` 함수 사용
          let damageMessage = await game.lhCombatFn.doDamage(
            targetActor,
            ["physical"],
            damage,
            true
          );

          // 피해 결과를 채팅에 출력
          ChatMessage.create({
            content: damageMessage,
            speaker: ChatMessage.getSpeaker({ actor: currentActor }),
          });
        }
      },
    },
    cancel: {
      icon: '<i class="fas fa-times"></i>',
      label: "취소",
    },
  },
  default: "roll",
}).render(true);
