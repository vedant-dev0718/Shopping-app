const BargainSchedule = require('../modules/bargain/bargainSchedule.model');
const bargainService = require('../modules/bargain/bargain.service');

const runBargainAutoClose = async () => {
  const now = new Date();
  const schedules = await BargainSchedule.find({
    status: 'active',
    endDate: { $lte: now }
  });

  const summary = {
    closed: 0,
    errors: 0
  };

  for (const schedule of schedules) {
    try {
      await bargainService.closeBargain(
        { id: schedule.sellerId },
        schedule.productId,
        { force: true }
      );
      summary.closed += 1;
      console.log(`Auto-closed bargain schedule ${schedule._id}`);
    } catch (error) {
      summary.errors += 1;
      console.error(`Failed to auto-close bargain schedule ${schedule._id}:`, error.message);
    }
  }

  return summary;
};

module.exports = {
  runBargainAutoClose
};
