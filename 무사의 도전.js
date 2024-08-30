// 매크로를 실행할 때 전달된 인수에서 필요한 데이터를 가져오기
let { actor: currentActor, item: currentItem } = args[0] ?? {};

// 유효성 검사
if (!currentActor || !currentItem) {
  ui.notifications.error("아이템 또는 배우를 찾을 수 없습니다.");
  return;
}

let targetActor;
while (true) {
  // 대상 선택 확인 (단일 대상 선택)
  targetActor = await game.lhCombatFn.selectTarget("single");

  // 대상이 선택되지 않았거나, 선택된 대상이 플레이어가 아닌 경우 재선택 요청
  if (!targetActor) {
    ui.notifications.error("유효한 대상을 선택하세요.");
  } else if (targetActor.type !== "character") {
    ui.notifications.error("플레이어 캐릭터를 선택하세요.");
  } else {
    break; // 유효한 대상이 선택된 경우 반복문 종료
  }
}

// MP 소모
const mpCost = 2;
let mpResult = await game.lhCombatFn.consumeMana(currentActor, mpCost);
if (!mpResult.success) {
  ui.notifications.error(mpResult.message);
  return;
}

// 헤이트 증가
const hateIncrease = 1;
let hateValue =
  foundry.utils.getProperty(currentActor.system, "infos.hate") || 0;
await game.lhCombatFn.increaseHate(currentActor, hateIncrease);

// 아군의 헤이트 감소
const hateDecrease = 3;
await game.lhCombatFn.decreaseHate(targetActor, hateDecrease);

// 결과 메시지 출력
let message = `
<h3>${currentActor.name}의 행동: ${currentItem.name}</h3>
<p>
  ${currentActor.name}이(가) ${
  targetActor.name
}의 헤이트를 ${hateDecrease}만큼 감소시켰습니다.</p>
<p>
  ${
    currentActor.name
  }의 헤이트가 ${hateIncrease}만큼 증가했습니다. (현재 헤이트: ${foundry.utils.getProperty(
  currentActor.system,
  "infos.hate"
)})</p>
<p>
  MP ${mpCost} 소모되었습니다. (현재 MP: ${foundry.utils.getProperty(
  currentActor.system,
  "mana.value"
)})</p>
`;

ChatMessage.create({
  content: message,
  speaker: ChatMessage.getSpeaker({ actor: currentActor }),
});
